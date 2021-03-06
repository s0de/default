$(function () {
    var list = {
        options: {
            url: undefined,
            groupActionUrl: undefined,
            sortUrl: undefined,
            columnsUrl: undefined,
            searchTimeout: 500,
            name: undefined
        },
        id: undefined,
        currentUrl: undefined,
        $listBlock: undefined,

        _searchTimer: undefined,
        _searchQuery: undefined,

        init: function (options) {
            this.options = $.extend(this.options, options);
            this.currentUrl = this.options.url;
            this.id = this.$listBlock.data('id');
            this.initSort();
        },
        setUrl: function (url) {
            this.currentUrl = url;
            this.update();
        },
        modifyUrl: function (key, value) {
            var url = this.currentUrl;
            var params = {};
            var cleanUrl = url;
            if (url.indexOf('?') !== -1) {
                cleanUrl = url.substr(0, url.indexOf('?'));
                var paramsString = url.substr(url.indexOf('?') + 1);
                params = $.deparam(paramsString);
            }
            params[key] = value;
            paramsString = $.param(params);
            this.setUrl(cleanUrl + '?' + paramsString)
        },
        setListBlock: function ($listBlock) {
            this.$listBlock = $listBlock;
        },
        getListSelector: function () {
            return '[data-id="' + this.id + '"]';
        },
        getUpdateBlockSelector: function () {
            return this.getListSelector() + ' .list-update-block';
        },
        getTable: function () {
            return this.$listBlock.find('[data-list-table]');
        },
        setLoading: function () {
            this.$listBlock.addClass('loading');
        },
        unsetLoading: function () {
            this.$listBlock.removeClass('loading');
        },
        update: function () {
            var me = this;
            me.setLoading();
            var listColumnsOpened = me.$listBlock.find('.columns-list-appender').hasClass('list');

            $.ajax({
                url: this.currentUrl,
                success: function (page) {
                    var $page = $('<div/>').append(page);
                    var ubSelector = me.getUpdateBlockSelector();
                    $(ubSelector).replaceWith($page.find(ubSelector));
                    me.initSort();
                    if (listColumnsOpened) {
                        me.$listBlock.find('.columns-list-appender').addClass('list');
                    }
                    me.unsetLoading();
                }
            });
        },
        checkAll: function (bool) {
            this.$listBlock.find('tr[data-pk] td.checker input, [data-checkall-list]').prop('checked', bool);
        },
        getPkList: function () {
            var pkList = [];
            this.$listBlock.find('input[type=checkbox][name="pk_list[]"]:checked').each(function () {
                var $checkbox = $(this);
                pkList.push($checkbox.val());
            });
            return pkList;
        },
        groupAction: function (action) {
            var me = this;
            me.setLoading();
            $.ajax({
                url: me.options.groupActionUrl,
                type: 'post',
                dataType: 'json',
                data: {
                    action: action,
                    pk_list: me.getPkList()
                },
                success: function (data) {
                    me.unsetLoading();
                    var type = 'success';
                    if (!data.success) {
                        type = 'error';
                    }
                    if (data.message) {
                        window.addFlashMessage(data.message, type);
                    }

                    if (data.success) {
                        me.update();
                    }
                }
            })
        },
        groupUpdate: function () {
            this.$listBlock.addClass('update');
            var pkList = this.getPkList();
            this.modifyUrl('update_' + this.options.name, pkList);
        },
        groupSave: function () {
            var me = this;
            var data = this.$listBlock.find('td.updatable input, td.updatable textarea, td.updatable select').serialize();
            $.ajax({
                url: me.currentUrl,
                method: 'post',
                data: data,
                success: function (data) {
                    if (data.status == 'success') {
                        me.modifyUrl('update_' + me.options.name, []);
                    } else if (data.hasOwnProperty('errors')) {
                        _.each(data.errors, function (errors, formname) {
                            validator_validate_form(formname, errors);
                        });
                    }
                }
            })
        },
        search: function (search) {
            var me = this;
            if (me._searchQuery != search) {
                me._searchQuery = search;
                me.setLoading();
                clearTimeout(me._searchTimer);
                me._searchTimer = setTimeout(function () {
                    me.processSearch(search);
                }, me.options.searchTimeout);
            }
        },
        processSearch: function (search) {
            var me = this;
            me.modifyUrl('search', search);
        },
        initSort: function() {
            if (this.options.sortUrl) {
                this.initSortEvents();
            }
        },
        initSortEvents: function () {
            var me = this;
            var $table = me.getTable();

            $table.find("tbody").sortable({
                axis: 'y',
                placeholder: "highlight",
                start: function(e, ui){
                    ui.placeholder.height(ui.item.height());
                },
                helper: function (e, ui) {
                    ui.children().each(function () {
                        var $this = $(this);
                        $this.width($this.width());
                    });
                    return ui;
                },
                update: function (event, ui) {
                    var $to = $(ui.item),
                        $prev = $to.prev(),
                        $next = $to.next();

                    var pk_list = $(this).sortable('toArray', {
                        attribute: 'data-pk'
                    });

                    me.setSort(pk_list, $to.data('pk'), $prev.data('pk'), $next.data('pk'))
                }
            });
        },
        setSort: function (pk_list, to, prev, next) {
            var me = this;
            $.ajax({
                url: me.options.sortUrl,
                type: 'post',
                dataType: 'json',
                data: {
                    action: 'sort',
                    pk_list: pk_list,
                    to: to,
                    prev: prev,
                    next: next
                },
                success: function (data) {
                    //me.update();
                }
            })
        },
        saveColumns: function () {
            var columns = [];
            var me = this;

            this.$listBlock.find('[name="columns_list[]"]:checked').each(function() {
                columns.push($(this).val());
            }).val();

            $.ajax({
                url: me.options.columnsUrl,
                type: 'post',
                dataType: 'json',
                data: {
                    columns: columns
                },
                success: function (data) {
                    if (data.success) {
                        me.update();
                    }
                }
            });
        }
    };

    $.fn.adminList = function(options) {
        var item = $.extend(true, {}, list);
        item.setListBlock(this);
        this.data('object', item);
        item.init(options);
    };


    function getListBlock($element)
    {
        return $element.closest('.list-block');
    }

    function getList($element)
    {
        var $listBlock = getListBlock($element);
        return $listBlock.data('object');
    }

    $(document).on('click', '.list-block .pagination-block a', function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.setUrl($this.attr('href'));
        return false;
    });

    $(document).on('click', '.list-block table thead a.title', function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.setUrl($this.attr('href'));
        return false;
    });

    $(document).on('click', '.list-block table tbody tr[data-children]', function (e) {
        if (!$(e.target).closest('a').length) {
            e.preventDefault();
            window.location = $(this).data('children');
            return false
        }
        return e;
    });


    $(document).on('change', '.list-block .pagination-block [data-pagesize]', function (e) {
        var $this = $(this);
        var url = $this.val();
        var list = getList($this);
        list.setUrl(url);
    });

    $(document).on('click', '.list-block [data-group-remove]', function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.groupAction('remove');
        return false;
    });

    $(document).on('click', '.list-block [data-group-update]', function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.groupUpdate();
        return false;
    });

    $(document).on('click', '.list-block [data-group-save]', function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.groupSave();
        return false;
    });

    $(document).on('click', '.list-block [data-group-submit]', function (e) {
        e.preventDefault();
        var $this = $(this);
        var $listBlock = getListBlock($this);
        var action = $listBlock.find('[data-group-action]').val();
        if (action) {
            var list = getList($this);
            list.groupAction(action);
        }
        return false;
    });

    $(document).on('change keyup', '.list-block [data-list-search]',function (e) {
        e.preventDefault();
        var $this = $(this);
        var list = getList($this);
        list.search($this.val());
    });

    $(document).on('list-update', function (e, $element) {
        var list = getList($element);
        list.update();
    });

    $(document).on('click', '.appender-columns', function (e) {
        e.preventDefault();
        var $this = $(this);
        $this.closest('.columns-list-appender').toggleClass('list');
        return false;
    });

    $(document).on('change', '.columns-list-appender input', function () {
        var list = getList($(this));
        list.saveColumns();
    });

    $(document).on('change', '[data-checkall-list]', function() {
        var $this = $(this);
        var list = getList($this);
        list.checkAll($this.is(':checked'));
    });

    $(document).on('click', '.list-block a.related-modal', function (e) {
        e.preventDefault();
        var $this = $(this);
        $this.modal({
            theme: 'related',
            useAjaxForm: true,
            closeOnSuccess: true,
            closeOnSuccessDelay: 1000,
            onFormSuccess: function() {
                var list = getList($this);
                list.update();
            }
        });
        return false;
    });
});